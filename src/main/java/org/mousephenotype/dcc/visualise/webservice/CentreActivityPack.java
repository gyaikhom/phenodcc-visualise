/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import java.util.List;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlSeeAlso;
import javax.xml.bind.annotation.XmlType;
import org.mousephenotype.dcc.visualise.entities.ActivityData;

/**
 * Response package for centre activity data returned by the 
 * CentreFacadeREST web service.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@XmlSeeAlso(ActivityData.class)
@XmlType(propOrder = {"success", "total", "activity"})
public class CentreActivityPack extends AbstractRestResponse<ActivityData> {

    @Override
    @XmlElement(name = "activity")
    public List<ActivityData> getDataSet() {
        return super.getDataSet();
    }
}
